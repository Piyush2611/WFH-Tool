const cv = require("opencv4nodejs");

const wCap = new cv.VideoCapture(0);
setInterval(() => {
  let frame = wCap.read();
  const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
  const { objects } = classifier.detectMultiScale(frame.bgrToGray());
  console.log("Faces Detected:", objects.length);
}, 0);
