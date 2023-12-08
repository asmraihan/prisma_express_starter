const path = require("path");

const publicDirectory = path.join(__dirname, "public");

const uploadFile = async (file, destination) => {
    // const file = req.files.img;
    // if (!file.mimetype) return "";
    const filename = Date.now() + file.name;

    try {
        await file.mv(path.join(publicDirectory, destination, filename));
        console.log("File uploaded");
        return filename;
    } catch (err) {
        console.error("Error uploading file:", err);
        throw err;
    }
};


module.exports = { uploadFile };