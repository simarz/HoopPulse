import axios from "axios";

const client = axios.create({
  baseURL: "",
  timeout: 90000,
});

export default client;
