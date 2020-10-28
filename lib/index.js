"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const amqplib = __importStar(require("amqplib"));
const assert_1 = __importDefault(require("assert"));
const plugin = fastify_plugin_1.default(async (fastify, options) => {
    if (fastify.hasDecorator('amqp')) {
        return;
    }
    assert_1.default.notStrictEqual(options.amqp, undefined, 'require options.amqp');
    const amqp = {
        connection: await amqplib.connect(options.amqp, options.socketOptions),
        queue: {},
        async consume(queue, onMessage, opt) {
            if (fastify.amqp.queue[queue] === undefined) {
                throw new Error('queue not found');
            }
            return this.queue[queue].consume(queue, onMessage, opt);
        },
        sendToQueueJson(queue, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object, options) {
            if (fastify.amqp.queue[queue] === undefined) {
                return false;
            }
            return fastify.amqp.queue[queue].sendToQueue(queue, Buffer.from(JSON.stringify(object)), options);
        },
        sendToQueueString(queue, object, options) {
            if (fastify.amqp.queue[queue] === undefined) {
                return false;
            }
            return fastify.amqp.queue[queue].sendToQueue(queue, Buffer.from(object), options);
        },
        sendToQueueBuffer(queue, object, options) {
            if (fastify.amqp.queue[queue] === undefined) {
                return false;
            }
            return fastify.amqp.queue[queue].sendToQueue(queue, object, options);
        },
    };
    fastify.decorate('amqp', amqp);
    if (options.queue) {
        for (const key in options.queue) {
            fastify.amqp.queue[key] = await fastify.amqp.connection.createChannel();
            await fastify.amqp.queue[key].assertQueue(key, options.queue[key]);
        }
    }
    fastify.addHook('onClose', async () => {
        for (const key in fastify.amqp.queue) {
            await fastify.amqp.queue[key].close();
        }
        await fastify.amqp.connection.close();
    });
});
exports.default = plugin;
