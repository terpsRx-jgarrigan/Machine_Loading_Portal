import { useCallback, useLayoutEffect } from 'react';
import Quagga from '@ericblade/quagga2';

function getMedian (arr) {
    arr.sort((a,b) => a - b);
    const half = Math.floor(arr.length / 2);
    if (arr.length % 2 === 1) {
        return arr[half];
    }
    return (arr[half - 1] + arr[half]) / 2;
}

function getMedianOfCodeErrors (decodedCodes) {
    const errors = decodedCodes.filter(x => x.error !== undefined).map(x => x.error);
    const medianOfErrors = getMedian(errors);
    return medianOfErrors;
}

const QuaggaScanner = ({
    onDetected,
    scannerRef
}) => {
    const errorCheck = useCallback((result) => {
        if (!onDetected) {
            return;
        }
        const error = getMedianOfCodeErrors(result.codeResult.decodedCodes);
        if (error < 0.25) {
            onDetected(result.codeResult.code);
        }
    }, [onDetected]);

    const handleProcessed = (result) => {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;
        drawingCtx.font = "24px Arial";
        drawingCtx.fillStyle = 'green';
        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0,0,parseInt(drawingCanvas.getAttribute('width')),parseInt(drawingCanvas.getAttribute('height')));
                result.boxes.filter((box) => box !== result.box).forEach((box) => {
                    Quagga.ImageDebug.drawPath(box, {x:0,y:1}, drawingCtx, {color:'purple',lineWidth:2});
                });
            }
            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, {x:0,y:1}, drawingCtx, {color:'blue',lineWidth:2});
            }
            if (result.codeResult && result.codeResult.code) {
                drawingCanvas.font = '24px Arial';
                drawingCtx.fillText(result.codeResult.code, 10, 20);
            }
        }
    };

    useLayoutEffect(() => {
        Quagga.init({
            inputStream: {
                type: 'LiveStream',
                constraints: {
                    width: 640,
                    height: 480,
                },
                target: scannerRef.current,
            },
            locator: {
                patchSize: 'x-large',
                halfSample: true,
            },
            decoder: {
                readers: ['ean_8_reader'],
            },
            numOfWorkers: 4,
            frequency: 10,
            facingMode: 'environment',
            locate: true,
        }, (error) => {
            Quagga.onProcessed(handleProcessed);
            if (error) {
                return console.log(error);
            }
            if (scannerRef && scannerRef.current) {
                Quagga.start();
            }
        });
        Quagga.onDetected(errorCheck);
        return () => {
            Quagga.offDetected(errorCheck);
            Quagga.offProcessed(handleProcessed);
            Quagga.stop();
        };
    }, [onDetected, scannerRef, errorCheck]);
    return null;
}
export default QuaggaScanner;