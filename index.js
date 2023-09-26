const express = require("express");
const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { uploadFile } = require("./s3");
const crypto = require("crypto");
const bucketName = process.env.AWS_BUCKET_NAME;

const app = express();
const port = 8050; // Replace with your desired port number

const directoryToWatch = "./images"; // Replace with your folder path

const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const sender = process.env.SENDER;
const client = require("twilio")(accountSid, authToken);

let serverStarted = false;

// Middleware to watch for changes in the specified directory
const watcher = chokidar.watch(directoryToWatch);

const debounceMap = new Map();
const debounceDelay = 1000; // Adjust this as needed

// Function to check if a file is new (added after the server started)
function isNewFile(filePath) {
  const fileStats = fs.statSync(filePath);
  const fileCreationTime = fileStats.birthtime; // Get the file creation time
  return fileCreationTime > serverStartTime;
}

const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

// Get the server start time
const serverStartTime = new Date();

watcher.on("add", async (filePath) => {
  const fileExtension = path.extname(filePath);

  // Check if the server has started, if the file is new, and if it's a .png file
  if (
    serverStarted &&
    isNewFile(filePath) &&
    fileExtension.toLowerCase() === ".png" &&
    !debounceMap.has(filePath)
  ) {
    debounceMap.set(filePath, true);

    setTimeout(() => {
      debounceMap.delete(filePath);
    }, debounceDelay);

    console.log(`New file added: ${filePath}`);

    // Process the newly added .png file
    const fileBuffer = await sharp(filePath)
      .resize({ width: 1080, fit: "contain" })
      .toBuffer();

    const imageName = generateFileName();
    await uploadFile(fileBuffer, imageName, "image/png"); // You can set the MIME type accordingly

    const imageUrl = `https://${bucketName}.s3.amazonaws.com/${imageName}`;
    console.log(`Uploaded image URL: ${imageUrl}`);

    client.messages
      .create({
        to: "2139083888",
        from: sender, // replace with your Twilio phone number
        mediaUrl: imageUrl,
      })
      .then((message) => console.log(`Message sent to ${message.to}`))
      .catch((err) => console.error(err));

    // Do something with the new .png file here
  }
});

// Define your routes and other middleware here

app.listen(port, () => {
  serverStarted = true;
  console.log(`Server is running on port ${port}`);
});
