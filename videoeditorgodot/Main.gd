extends Control

@onready var video_player = $VBox/MainWorkspace/VideoArea/VideoContainer/VideoStreamPlayer
@onready var time_slider = $VBox/MainWorkspace/VideoArea/ControlsArea/Timeline/TimeSlider
@onready var time_label = $VBox/MainWorkspace/VideoArea/ControlsArea/Timeline/TimeLabel
@onready var start_label = $VBox/MainWorkspace/VideoArea/ControlsArea/RangeControls/StartLabel
@onready var end_label = $VBox/MainWorkspace/VideoArea/ControlsArea/RangeControls/EndLabel
@onready var play_pause_button = $VBox/MainWorkspace/VideoArea/ControlsArea/Timeline/PlayPauseButton
@onready var open_button = $VBox/TopBar/Margin/HBox/OpenButton
@onready var file_dialog = $FileDialog

@onready var history_list = $VBox/MainWorkspace/ToolsPanel/History/Margin/VBox/HistoryList
@onready var range_info_label = $"VBox/MainWorkspace/ToolsPanel/AI Analysis/Margin/VBox/RangeInfo"
@onready var analysis_result = $"VBox/MainWorkspace/ToolsPanel/AI Analysis/Margin/VBox/AnalysisResult"
@onready var magic_prompt = $VBox/MainWorkspace/ToolsPanel/Edit/Margin/VBox/MagicPrompt

@onready var http_ollama = $HTTP_Ollama
@onready var http_agent = $HTTP_Agent

var start_time: float = 0.0
var end_time: float = 1.0
var duration: float = 0.0
var is_dragging_slider: bool = false
var has_loaded_video: bool = false

func _ready():
    # Connect UI signals
    open_button.pressed.connect(_on_open_button_pressed)
    file_dialog.file_selected.connect(_on_file_selected)
    play_pause_button.pressed.connect(_on_play_pause_pressed)
    
    time_slider.value_changed.connect(_on_time_slider_value_changed)
    time_slider.drag_started.connect(func(): is_dragging_slider = true)
    time_slider.drag_ended.connect(func(_changed): 
        is_dragging_slider = false
        if _changed and video_player.stream != null:
            video_player.stream_position = time_slider.value
    )
    
    $VBox/MainWorkspace/VideoArea/ControlsArea/RangeControls/SetStartButton.pressed.connect(_on_set_start_pressed)
    $VBox/MainWorkspace/VideoArea/ControlsArea/RangeControls/SetEndButton.pressed.connect(_on_set_end_pressed)
    $VBox/MainWorkspace/VideoArea/ControlsArea/RangeControls/CutButton.pressed.connect(_on_cut_pressed)
    
    $"VBox/MainWorkspace/ToolsPanel/History/Margin/VBox/HBox/ClearHistoryButton".pressed.connect(_on_clear_history)
    $"VBox/MainWorkspace/ToolsPanel/AI Analysis/Margin/VBox/AnalyzeButton".pressed.connect(_on_analyze_pressed)
    
    var edit_margin = $VBox/MainWorkspace/ToolsPanel/Edit/Margin/VBox
    edit_margin.get_node("HBox/MagicPromptButton").pressed.connect(_on_magic_prompt_pressed)
    edit_margin.get_node("HBox/GenerateButton").pressed.connect(_on_generate_image_pressed)

    var effects_grid = edit_margin.get_node("EffectsGrid")
    for child in effects_grid.get_children():
        if child is Button:
            child.pressed.connect(_on_effect_applied.bind(child.text))
    
    # HTTP signals
    http_ollama.request_completed.connect(_on_ollama_request_completed)
    http_agent.request_completed.connect(_on_agent_request_completed)

func _process(_delta):
    if has_loaded_video and video_player.is_playing():
        var pos = video_player.stream_position
        if not is_dragging_slider:
            time_slider.value = pos
        time_label.text = "%.1fs / %.1fs" % [pos, duration]
        
        # Loop playback within the selected range logically
        if pos >= end_time:
            video_player.stream_position = start_time

func _on_open_button_pressed():
    file_dialog.popup_centered()

func _on_file_selected(path: String):
    # Depending on Godot 4 build format could vary, VideoStreamTheora handles .ogv
    var stream = VideoStreamTheora.new()
    stream.file = path
    video_player.stream = stream
    video_player.play()
    
    has_loaded_video = true
    play_pause_button.text = "Pause"
    
    # Using 30s as a mock duration for the scrubber, as stream duration might not parse
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
    # Only update text if paused or dragging
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
    history_list.move_child(label, 0) # insert at top

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
