import judge0 from "../config/judge0.client.js";

export const checkHealth = async (req, res) => {
  try {
    const response = await judge0.get("/workers")
    if (response.status === 200) {
      return res.status(200).json(response.data);
    } else {
      console.log("Judge0 service health check failed:", response);
      return res.status(500).json({ error: "Unable to reach Judge0 service" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Unable to reach Judge0 service" });
  }
};
