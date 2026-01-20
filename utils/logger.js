const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
);

const dailyRotateFileTransport = new transports.DailyRotateFile({
    filename: path.join('logs', 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});

const logger = createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'dwarf-bot' },
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple(),
            ),
        }),
        dailyRotateFileTransport,
    ],
});

module.exports = logger;
