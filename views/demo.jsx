import React from 'react';

import { Icon, Tabs, Pane } from 'watson-react-components';

import voices from '../voices';

const synthesizeUrl = `/api/synthesize?voice={this.state.voice.name}&text={encodeURIComponent(this.state.text)}`;

// audio/wav
// "audio/mpeg;codecs=mp3"
// "audio/ogg;codecs=opus"

let canPlayAudioFormat = function(mimeType) {
  let audio = document.createElement("audio");
  if (audio) {
    return (typeof audio.canPlayType === "function" &&
    audio.canPlayType(mimeType) !== "");
  } else {
    return false
  }
};

class ConditionalSpeakButton extends React.Component {
  componentDidMount() {
    if (canPlayAudioFormat("audio/ogg;codecs=opus")) {
      this.setState({canPlay: true});
    } else {
      this.setState({canPlay: false});
    }
  }

  render() {
    if (this.state && this.state.canPlay) {
      return (<button
          onClick={this.props.onClick}
          className="base--button speak-button"
      >
        Speak
      </button>);
    } else {
      return (
          <span>
            <button
                onClick={this.props.onClick}
                className="base--button speak-button speak-disabled"
                title="Only available on Chrome and Firefox"
                disabled={true}
            >
              Speak
            </button>
          </span>);
    }
  }
}

export default React.createClass({

  getInitialState() {
    return {
      voice: voices[3], // Alisson is the first voice
      error: null, // the error from calling /classify
      text: voices[3].demo.text, // default text
      ssml: voices[3].demo.ssml, // SSML text
      voice_ssml: voices[3].demo.voice_ssml, // Voice SSML text, only Allison supports this
      current_tab: 0,
      loading: false
    };
  },

  onTabChange(idx) {
    this.setState({current_tab: idx});
  },

  onTextChange(event) {
    this.setState({ text: event.target.value, ssml: "", voice_ssml: "" });
  },

  onSsmlChange(event) {
    this.setState({ ssml: event.target.value, text: "", voice_ssml: "" });
  },

  onVoiceSsmlChange(event) {
    this.setState({ voice_ssml: event.target.value, ssml: "", text: "" });
  },

  setupParamsFromState(do_download) {
    let params = new URLSearchParams();
    if (this.state && this.state.current_tab === 0) {
      params.set('text', this.state.text);
      params.set('voice', this.state.voice.name);
      params.set('download', do_download);
    } else if (this.state && this.state.current_tab === 1) {
      params.set('text', this.state.ssml);
      params.set('voice', this.state.voice.name);
      params.set('download', do_download);
    } else if (this.state && this.state.current_tab === 2) {
      params.set('text', this.state.voice_ssml);
      params.set('voice', this.state.voice.name);
      params.set('download', do_download);
    }
    return params
  },

  onDownload() {
    let params = this.setupParamsFromState(true);
    window.location.href = `/api/synthesize?${params.toString()}`
  },

  onSpeak() {
    let params = this.setupParamsFromState(true);
    this.setState({loading: true});
    fetch(`/api/synthesize?${params.toString()}`).then((response) => {
      if (response.ok) {
        response.blob().then((blob) => {
          let url = window.URL.createObjectURL(blob);
          let audio = document.getElementById('audio');
          this.setState({loading: false});

          audio.setAttribute('src',url);
          audio.setAttribute('autoplay','true');
          audio.setAttribute('type',"audio/ogg;codecs=opus");
          audio.style.opacity = 1.0;
        });
      } else {
        this.setState({loading: false});
        audio.style.opacity = 0.0;
        response.json().then((json) => {
          this.setState({error: json});
          setTimeout(function() {
            this.setState({error: null});
          }.bind(this), 5000);
        });
      }
    })
  },

  onResetClick() {
    const currentVoice = this.state.voice;
    this.setState({
      error: null,
      text: currentVoice.demo.text,
      ssml: currentVoice.demo.ssml,
      ssml_voice: currentVoice.demo.ssml_voice,
      spoken: null
    });
  },

  onVoiceChange(event) {
    const voice = voices[voices.map(v => v.name).indexOf(event.target.value)];
    console.log(voice.demo.text);
    this.setState({
      voice,
      error: null,
      text: voice.demo.text,
      ssml: voice.demo.ssml,
      ssml_voice: voice.demo.ssml_voice,
    });
  },

  render() {
    return (
      <section className="_container _container_large">
        <div className="row">
          <h2 className="base--h2">Input Text</h2>
          <p className="base--p" >
            The text language must match the selected voice language: Mixing language
            (English text with a Spanish male voice) does not produce valid results.
            The synthesized audio is streamed to the client as it is being produced,
            using the HTTP chunked encoding. The audio is returned in the Ogg Opus
            format which can be played using VLC and Audacity players.
          </p>
          <div className="voice-input">
            <select
              name="voice"
              className="base--select"
              onChange={this.onVoiceChange}
              value={this.state.voice.name}
            >
              {
                voices.map(voice => (
                  <option key={voice.name} value={voice.name}>{voice.option}</option>
                  )
                )
              }
            </select>
          </div>

          <Tabs selected={0} onChange={this.onTabChange}>
            <Pane label="Text">
              <textarea
                onChange={this.onTextChange}
                className="base--textarea textarea"
                spellCheck="false"
                value={this.state.text || ''}
              />
            </Pane>
            <Pane label="Expressive SSML">
              <textarea
                onChange={this.onSsmlChange}
                className="base--textarea textarea"
                spellCheck="false"
                value={this.state.ssml || ''}
              />
            </Pane>
            <Pane label="Voice Transformation SSML">
              <textarea
                readOnly={!this.state.voice_ssml}
                onChange={this.onVoiceSsmlChange}
                className="base--textarea textarea"
                spellCheck="false"
                value={this.state.voice_ssml || 'Voice Transformation not currently supported for this language.'}
              />
            </Pane>
          </Tabs>
          <div style={{display: "flex", flexDirection: "column", margin: "1rem" }}>
            <div className="audioplayer-container">
              <div className="errorMessage" style={{opacity: this.state.error ? 1 : 0}}>
                {this.state.error ? this.state.error.error : ""}
              </div>
              <span id="loader" style={{display: this.state.loading ? "inline" : "none"}}><Icon type="loader"/></span>
              <audio id="audio" className="audio" controls="controls">
                Your browser does not support the audio element.
              </audio>
            </div>
            <div style={{display: "flex", flexDirection: "row" }}>

              <div className="buttons-container">
                <button
                    onClick={this.onDownload}
                    className="base--button download-button"
                >
                  Download
                </button>
                <ConditionalSpeakButton onClick={this.onSpeak}/>
              </div>
              <div className="reset-container">
                <Icon type="reset" />
                <a className="base--a reset-button" onClick={this.onResetClick}>Reset</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  },
});
