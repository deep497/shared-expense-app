const fs = require("fs");
const importService = require("../services/importService");

/**
 * Handles CSV file uploads and returns the import report.
 * Cleans up the uploaded file from the server's filesystem upon completion or failure.
 */
async function importCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Please upload a CSV file." });
  }

  const groupIdStr = req.body.group_id || req.query.group_id;
  if (!groupIdStr) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: "group_id is required in request body or query parameter." });
  }

  const groupId = parseInt(groupIdStr, 10);
  if (isNaN(groupId)) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: "group_id must be a valid integer." });
  }

  const filePath = req.file.path;

  try {
    const report = await importService.importCSV(filePath, groupId);

    // Clean up file asynchronously to avoid blocking
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting temp file ${filePath}:`, err);
      }
    });

    return res.status(200).json(report);
  } catch (error) {
    // Clean up file in case of validation/parsing crash
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting temp file ${filePath} on failure:`, err);
        }
      });
    }

    console.error("CSV Import failed:", error);
    return res.status(500).json({
      error: "Failed to process CSV file.",
      details: error.message,
    });
  }
}

module.exports = {
  importCSV,
};
