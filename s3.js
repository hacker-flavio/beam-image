const crypto = require("crypto");

const generateFileName = async (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

async function uploadFile(
  s3Client,
  PutObjectCommand,
  bucketName,
  fileBuffer,
  mimetype
) {
  const imgURL = await generateFileName();
  const uploadParams = {
    Bucket: bucketName,
    Body: fileBuffer,
    Key: imgURL,
    ContentType: mimetype,
  };
  s3Client.send(new PutObjectCommand(uploadParams));
  return uploadParams;
}

module.exports = {
  uploadFile,
};
