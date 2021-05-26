import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import QrReader from 'react-qr-reader';
import QuaggaScanner from './QuaggaScanner';
import Quagga from '@ericblade/quagga2';

let device_details = undefined;
let device_lookup_attempted = false;
class ScanQR extends Component {
    constructor(props) {
        super(props)
        this.state = {
            delay: 500,
            facingMode: "environment",
            result: "No result",
            on: true,
        }
        this.handleScan = this.handleScan.bind(this)
    }
    handleScan (result) {
        if (!device_lookup_attempted) {
            if (result) {
                console.log("Handle Scan received:" + result);
                this.setState({ result: result, on: false, });
                FetchDeviceInformation(result);
            }
        }
    }
    handleError (error) {
        console.error("Handle Error received: " + error);
    }
    render () {
        const previewStyle = {
            height: 240,
            width: 320,
        }
        return (
            <div id='box'>
                <QrReader
                    delay={this.state.delay}
                    facingMode={this.state.facingMode}
                    style={previewStyle}
                    onError={this.handleError}
                    onScan={this.handleScan}
                    />
            </div>
        );
    }    
}

function FetchDeviceInformation (i) {
    const axios = require('axios').default;
    if (device_lookup_attempted) {
        return;
    }
    axios.get('http://localhost:8080/api/rx-batch-info-by-device/'+i)
        .then(function (response) {
            console.log(response)
            if (response.data.ok) {
                device_details = response.data.body;
                ReactDOM.render(<ScanBarcode />, document.getElementById('root'));
            } else {
                document.getElementById('box').innerHTML = '<p>' + JSON.stringify(response.data) + '</p>';
            }
        })
        .catch(function (error) {
            console.log(error);
            throw new Error(
                '<p>' + error + '</p><br/><pre>' + JSON.stringify(error) + '</pre>'
            );

        })
        .then(function () {
            device_lookup_attempted = true;
        });
}

class ScanBarcode extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scannerRef: { current: 'bill' },
            scanning: false,
            results: []
        }
    }
    setScanning () {
        this.setState({scanning: !this.state.scanning});
    }
    detectedCodeCallback (result) {
        if (result.length > 0) {
            console.log(result);
            document.getElementById('code_detected').innerHTML += '<br/>'+result;
            Quagga.stop();
            DoesBatchMatchALoad(result);
        }
    }
    render() {
        return (
            <div>
                <h1>Patient_id</h1>
                <br/>
                {device_details.patient_id}
                <br/>
                <h1>Device_id</h1>
                <br/>
                {device_details.device_id}
                <br/>
                <h1>Number of loads</h1>
                <br/>
                {device_details.loads.length}
                <br/>
                <h1>Scanned Code: </h1>
                <br/>
            <div id="code_detected"></div>
                <br/>
                <button onClick={() => this.setScanning()}>{this.state.scanning ? 'Stop' : 'Start'}</button>
                <div ref={this.state.scannerRef} style={{position: 'relative', border: '3px solid red'}}>
                    <canvas className="drawingBuffer" style={{
                        position: 'absolute',
                        top: '0px',
                        border: '3px solid green',
                    }} width="320" height="240" />
                    { this.state.scanning ? 
                        <QuaggaScanner 
                            scannerRef={this.state.scannerRef} 
                            onDetected={this.detectedCodeCallback}
                        /> : null }
                </div>
            </div>
        );
    }
}

function DoesBatchMatchALoad (batch_number) {
    const matched = false;
    const loads_index = undefined;
    for (let i = 0; i < device_details.loads.length; i++) {
        if (batch_number == device_details.loads[i].batch_number) {
            matched = true;
            loads_index = i;
            break;
        }
    }
    if (!matched) {
        ReactDOM.render(<UnmatchedBatchNumber />, document.getElementById('root'));
    } else {
        ReactDOM.render(<PostLoadedForm patient_id={device_details.patient_id} device_id={device_details.device_id} load_id={device_details.loads[loads_index].load_id} />, document.getElementById('root'));
    }
}

class UnmatchedBatchNumber extends Component {
    render () {
        return (
            <div>
                <p>This batch number is not for this device. Stop</p>
            </div>
        );
    }
}
class PostLoadedForm extends Component {
    constructor (props) {
        super(props);
        this.state = {
            value: '',
            patient_id: props.patient_id,
            device_id: props.device_id,
            load_id: props.load_id,
        };
        this.handleChange =  this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(event) {
        this.setState({value: event.target.value});
    }
    handleSubmit(event) {
        alert('A change was submitted: ' + this.state.value);
        event.preventDefault();
    }
    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <label for="patient_id">Patient ID</label>
                <input type="text" name="patient_id" id="patient_id" value={this.state.patient_id}/>
                <label for="device_id">Device ID</label>
                <input type="text" name="device_id" id="device_id" value={this.state.device_id}/>
                <label for="load_id">Load ID</label>
                <input type="text" name="load_id" id="load_id" value={this.state.load_id}/>
                <label for="has_remainders">Any Remainders?</label>
                <select name="has_remainders" id="has_remainders" onChange={this.handleChange}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                </select>
                <label for="remainder_count">How Many Remainders?</label>
                <input type="number" name="remainder_count" id="remainder_count" value="0" />
                <label for="submit">Submit</label>
                <input type="submit" value="Submit"/>
            </form>
        );
    }
}

ReactDOM.render(
    <ScanQR />,
    document.getElementById('root')
)