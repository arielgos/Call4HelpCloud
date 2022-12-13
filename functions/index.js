const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment");
const spawn = require("child-process-promise").spawn;
const path = require("path");
const os = require("os");
const fs = require("fs");

admin.initializeApp();

/**
 * hello world
 */
exports.helloWorld = functions.https
    .onRequest((request, response) => {
        functions.logger.info("Hola Mundo !" + moment().format(), { structuredData: true });
        response.send("Hola desde Firebase! " + moment().format());
    });

/**
 * resize image
 */
exports.resizeImage = functions.storage
    .object()
    .onFinalize(async (object) => {
        const filePath = object.name;
        const fileName = path.basename(filePath);
        if (!fileName.startsWith("thumb_")) {
            const fileBucket = object.bucket;
            const bucket = admin.storage().bucket(fileBucket);
            const tempFilePath = path.join(os.tmpdir(), fileName);
            const metadata = {
                contentType: object.contentType,
            };
            await bucket.file(filePath).download({ destination: tempFilePath });
            functions.logger.log("Image downloaded locally to", tempFilePath);
            // Generate a thumbnail using ImageMagick.
            await spawn("convert", [tempFilePath, "-thumbnail", "320x240>", tempFilePath]);
            functions.logger.log("Thumbnail created at", tempFilePath);
            const thumbFileName = `thumb_${fileName}`;
            const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
            await bucket.upload(tempFilePath, {
                destination: thumbFilePath,
                metadata: metadata,
            });
            return fs.unlinkSync(tempFilePath);
        } else {
            return console.log('Already a Thumbnail.');
        }
    });