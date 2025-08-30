    const faceapi = require('face-api.js');
    const canvas = require('canvas');
    const { Canvas, Image, ImageData } = canvas;
    const fs = require('fs');

    // patch the environment
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    const VIDEO_DEVICE = 0; // first camera

    async function startFaceTracking() {
      // Load models
      const modelPath = './models'; // download models into this folder
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

      console.log("Models loaded. Starting face tracking...");

      // Use webcam via opencv-video-capture alternative
      const cv = require('opencv4nodejs'); // optional if you already have it
      const wCap = new cv.VideoCapture(VIDEO_DEVICE);

      setInterval(async () => {
        let frame = wCap.read();

        if (frame.empty) {
          wCap.reset();
          return;
        }

        // Convert frame to canvas
        const frameRGB = cv.imencode('.jpg', frame).toString('base64');
        const img = new Image();
        img.src = Buffer.from(frameRGB, 'base64');
        const detections = await faceapi.detectAllFaces(img);

        console.log("Faces Detected:", detections.length);
      },0);
    }

    module.exports = { startFaceTracking };
