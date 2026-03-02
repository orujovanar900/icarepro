import { Logtail } from "@logtail/node"
import { LogtailTransport } from "@logtail/winston"
import winston from "winston"

const logtail = new Logtail("XvB4hMom2rW4QLLy35fcUM2P")

export const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new LogtailTransport(logtail)
    ]
})
