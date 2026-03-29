import axios from "axios";
import { ENV } from "./env.config.js";

const judge0 = axios.create({
  baseURL: ENV.JUDGE_SERVER_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Auth-Token": ENV.JUDGE_AUTH_TOKEN
  },
  timeout: 10000
});

export default judge0;
