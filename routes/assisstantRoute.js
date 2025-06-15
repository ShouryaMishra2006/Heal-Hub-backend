import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/analyze-prescription", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No image provided" });

    const formData = new FormData();
    formData.append("image", fs.createReadStream(file.path), file.originalname);
    console.log("why fear")
    const response = await axios.post(`${process.env.PYTHON_BACKEND_URL}/upload`, formData, {
      headers: formData.getHeaders(),
    });
    console.log("first processing done",response.data)
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error("Error deleting file:", err.message);
      } else {
        console.log("File deleted:", file.path);
      }
    });
    
    res.json(response.data);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/suggest-medicines", async (req, res) => {
  try {
    const { extracted_text } = req.body;
    console.log(extracted_text)
    if (!extracted_text) {
      return res.status(400).json({ error: "Missing extracted_text" });
    }

    const response = await axios.post(`${process.env.PYTHON_BACKEND_URL}/suggest-medicines`, {
      extracted_text,
    });
    console.log(response.data)
    console.log(response.data.conditions)
    res.json(response.data);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
