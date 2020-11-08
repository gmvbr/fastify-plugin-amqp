/// <reference types="node" />
import * as amqplib from 'amqplib';
export interface Context {
    connection: amqplib.Connection;
    queue: {
        [k: string]: amqplib.Channel;
    };
    consume: (queue: string, onMessage: (msg: amqplib.ConsumeMessage | null) => void, options?: amqplib.Options.Consume) => Promise<amqplib.Replies.Consume>;
    sendToQueueJson(queue: string, object: any, options?: amqplib.Options.Publish | undefined): boolean;
    sendToQueueString(queue: string, object: string, options?: amqplib.Options.Publish | undefined): boolean;
    sendToQueueBuffer(queue: string, object: Buffer, options?: amqplib.Options.Publish | undefined): boolean;
}
export interface PluginOptions {
    amqp: amqplib.Options.Connect | string;
    socketOptions?: any;
    queue?: {
        [k: string]: amqplib.Options.AssertQueue | undefined;
    };
}
declare module 'fastify' {
    interface FastifyInstance {
        amqp: Context;
    }
}
declare const plugin: import("fastify").FastifyPluginAsync<PluginOptions, import("http").Server>;
export default plugin;
