extends Control

# Modular References
@onready var top_bar = %TopBar
@onready var central_menu = %CentralMenu
@onready var video_area = %VideoArea
@onready var tools_panel = %ToolsPanel
@onready var file_dialog = %FileDialog
@onready var http_ollama = %HTTP_Ollama
@onready var http_agent = %HTTP_Agent
@onready var logo_background = %LogoBackground

# Video Area Nodes (Nested)
@onready var video_player = %VideoArea.get_node("%VideoStreamPlayer")
@onready var time_slider = %VideoArea.get_node("%TimeSlider")
@onready var time_label = %VideoArea.get_node("%TimeLabel")
@onready var play_pause_button = %VideoArea.get_node("%PlayPauseButton")
@onready var start_label = %VideoArea.get_node("%StartLabel")
@onready var end_label = %VideoArea.get_node("%EndLabel")

# Tools Panel Nodes (Nested)
@onready var history_list = %ToolsPanel.get_node("%HistoryList")
@onready var range_info_label = %ToolsPanel.get_node("%RangeInfo")
@onready var analysis_result = %ToolsPanel.get_node("%AnalysisResult")
@onready var magic_prompt = %ToolsPanel.get_node("%MagicPrompt")
@onready var effects_grid = %ToolsPanel.get_node("%EffectsGrid")

# Central Menu Nodes (Nested)
@onready var center_open_button = %CentralMenu.get_node("%CenterOpenButton")

var start_time: float = 0.0
var end_time: float = 1.0
var duration: float = 0.0
var is_dragging_slider: bool = false
var has_loaded_video: bool = false

func _ready():
    _apply_afterglow_animations(self)
    
    # Connect UI signals
    center_open_button.pressed.connect(_on_open_button_pressed)
    top_bar.get_node("%FileMenu").pressed.connect(_on_open_button_pressed)
    
    file_dialog.file_selected.connect(_on_file_selected)
    play_pause_button.pressed.connect(_on_play_pause_pressed)
    
    time_slider.value_changed.connect(_on_time_slider_value_changed)
    time_slider.drag_started.connect(func(): is_dragging_slider = true)
    time_slider.drag_ended.connect(func(_changed): 
        is_dragging_slider = false
        if _changed and video_player.stream != null:
            video_player.stream_position = time_slider.value
    )
    
    var range_controls = video_area.get_node("ControlsArea/RangeControls")
    range_controls.get_node("%SetStartButton").pressed.connect(_on_set_start_pressed)
    range_controls.get_node("%SetEndButton").pressed.connect(_on_set_end_pressed)
    range_controls.get_node("%CutButton").pressed.connect(_on_cut_pressed)
    
    tools_panel.get_node("%ClearHistoryButton").pressed.connect(_on_clear_history)
    tools_panel.get_node("%AnalyzeButton").pressed.connect(_on_analyze_pressed)
    
    tools_panel.get_node("%MagicPromptButton").pressed.connect(_on_magic_prompt_pressed)
    tools_panel.get_node("%GenerateButton").pressed.connect(_on_generate_image_pressed)

    for child in effects_grid.get_children():
        if child is Button:
            child.pressed.connect(_on_effect_applied.bind(child.text))
    
    # HTTP signals
    http_ollama.request_completed.connect(_on_ollama_request_completed)
    http_agent.request_completed.connect(_on_agent_request_completed)

func _apply_afterglow_animations(node: Node):
    if node is Button:
        node.mouse_entered.connect(func():
            var tween = create_tween()
            tween.tween_property(node, "modulate", Color(1.5, 2.0, 1.5, 1.0), 0.1)
        )
        node.mouse_exited.connect(func():
            var tween = create_tween()
            tween.tween_property(node, "modulate", Color(1.0, 1.0, 1.0, 1.0), 0.5)
        )
        node.pressed.connect(func():
            var tween = create_tween()
            node.modulate = Color(2.0, 3.0, 2.0, 1.0)
            tween.tween_property(node, "modulate", Color(1.0, 1.0, 1.0, 1.0), 0.8).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
        )
        
    for child in node.get_children():
        _apply_afterglow_animations(child)

func _process(_delta):
    if has_loaded_video and video_player.is_playing():
        var pos = video_player.stream_position
        if not is_dragging_slider:
            time_slider.value = pos
        time_label.text = "%.1fs / %.1fs" % [pos, duration]
        
        if pos >= end_time:
            video_player.stream_position = start_time

func _on_open_button_pressed():
    file_dialog.popup_centered()

func _on_file_selected(path: String):
    var stream = VideoStreamTheora.new()
    stream.file = path
    video_player.stream = stream
    video_player.play()
    
    has_loaded_video = true
    play_pause_button.text = "Pause"
    
    central_menu.visible = false
    video_area.visible = true
    
    var tween = create_tween()
    tween.tween_property(logo_background, "modulate:a", 0.02, 1.0)
    
    duration = 30.0 
    time_slider.max_value = duration
    start_time = 0.0
    end_time = duration
    _update_range_labels()
    
    add_history("OPEN", "Loaded " + path.get_file())

func _on_play_pause_pressed():
    if not has_loaded_video:
        return
    video_player.paused = not video_player.paused
    play_pause_button.text = "Play" if video_player.paused else "Pause"

func _on_time_slider_value_changed(value: float):
    if not video_player.is_playing() or is_dragging_slider:
        time_label.text = "%.1fs / %.1fs" % [value, duration]
        if not is_dragging_slider and has_loaded_video:
            video_player.stream_position = value

func _on_set_start_pressed():
    if not has_loaded_video: return
    start_time = time_slider.value
    if start_time >= end_time:
        end_time = min(start_time + 1.0, duration)
    _update_range_labels()

func _on_set_end_pressed():
    if not has_loaded_video: return
    end_time = time_slider.value
    if end_time <= start_time:
        start_time = max(0.0, end_time - 1.0)
    _update_range_labels()

func _update_range_labels():
    start_label.text = "Start: %.1fs" % start_time
    end_label.text = "End: %.1fs" % end_time
    range_info_label.text = "Analyzing sequence: %.1fs - %.1fs" % [start_time, end_time]

func _on_cut_pressed():
    if not has_loaded_video: return
    add_history("CUT", "Range %.1fs - %.1fs" % [start_time, end_time])
    duration = end_time - start_time
    start_time = 0.0
    end_time = duration
    time_slider.max_value = duration
    time_slider.value = 0.0
    _update_range_labels()

func add_history(type: String, msg: String):
    var label = Label.new()
    label.text = "[%s] %s" % [type, msg]
    history_list.add_child(label)
    history_list.move_child(label, 0)

func _on_clear_history():
    for child in history_list.get_children():
        child.queue_free()

func _on_effect_applied(effect_name: String):
    if not has_loaded_video: return
    add_history("EFFECT", effect_name)

func _on_analyze_pressed():
    if not has_loaded_video:
        analysis_result.text = "Load a video first to analyze."
        return
        
    analysis_result.text = "Requesting analysis..."
    var prompt = "Watch the video sequence from %.1fs to %.1fs. Identify key combat events." % [start_time, end_time]
    var payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": false
    }
    var headers = ["Content-Type: application/json"]
    http_ollama.request("http://localhost:11434/api/generate", headers, HTTPClient.METHOD_POST, JSON.stringify(payload))

func _on_ollama_request_completed(result, response_code, headers, body):
    if response_code == 200:
        var text = body.get_string_from_utf8()
        var json = JSON.parse_string(text)
        if json and json.has("response"):
            analysis_result.text = json["response"]
        else:
            analysis_result.text = "Parse error: expected 'response' key."
    else:
        analysis_result.text = "Ollama Request Failed. Code: " + str(response_code)

func _on_magic_prompt_pressed():
    magic_prompt.text = "Generating magic prompt..."
    http_agent.request("http://localhost:8000/api/prompt/magic")

func _on_agent_request_completed(result, response_code, headers, body):
    if response_code == 200:
        var text = body.get_string_from_utf8()
        var json = JSON.parse_string(text)
        if json and json.has("prompt"):
            magic_prompt.text = json["prompt"]
        else:
            magic_prompt.text = "Parse error"
    else:
        magic_prompt.text = "Agent API Failed. Code: " + str(response_code)

func _on_generate_image_pressed():
    var prompt = magic_prompt.text
    if prompt == "" or prompt.find("Generating") != -1: return
    add_history("IMAGE", "Generated magic asset from prompt!")
