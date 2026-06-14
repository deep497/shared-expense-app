const express = require("express");
const dotenv = require("dotenv");
const pool = require("./db");
const importRoutes = require("./routes/importRoutes");

dotenv.config();

const app = express();

app.use(express.json());
app.use("/api", importRoutes);


app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database Connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});