import morgan from "morgan";

morgan.token("localtime", () => new Date().toLocaleString());

export const requestLogger = morgan(
  "[:localtime] :method :url :status :response-time ms",
);
