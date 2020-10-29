import FastifyPlugin from 'fastify-plugin';
import {FastifyInstance} from 'fastify';

import * as amqplib from 'amqplib';
import assert from 'assert';

export interface Context {
  connection: amqplib.Connection;

  queue: {[k: string]: amqplib.Channel};

  consume: (
    queue: string,
    onMessage: (msg: amqplib.ConsumeMessage | null) => void,
    options?: amqplib.Options.Consume
  ) => Promise<amqplib.Replies.Consume>;

  sendToQueueJson(
    queue: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: any,
    options?: amqplib.Options.Publish | undefined
  ): boolean;

  sendToQueueString(
    queue: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: string,
    options?: amqplib.Options.Publish | undefined
  ): boolean;

  sendToQueueBuffer(
    queue: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: Buffer,
    options?: amqplib.Options.Publish | undefined
  ): boolean;
}

export interface PluginOptions {
  amqp: amqplib.Options.Connect | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const plugin = FastifyPlugin(
  async (fastify: FastifyInstance, options: PluginOptions): Promise<void> => {
    if (fastify.hasDecorator('amqp')) {
      return;
    }
    assert.notStrictEqual(options.amqp, undefined, 'require options.amqp');
    const amqp: Context = {
      connection: await amqplib.connect(options.amqp, options.socketOptions),
      queue: {},
      async consume(
        queue: string,
        onMessage: (msg: amqplib.Message | null) => void,
        opt?: amqplib.Options.Consume
      ): Promise<amqplib.Replies.Consume> {
        if (fastify.amqp.queue[queue] === undefined) {
          throw new Error('queue not found');
        }
        return this.queue[queue].consume(queue, onMessage, opt);
      },
      sendToQueueJson(
        queue: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        object: any,
        options?: amqplib.Options.Publish | undefined
      ): boolean {
        if (fastify.amqp.queue[queue] === undefined) {
          return false;
        }
        return fastify.amqp.queue[queue].sendToQueue(
          queue,
          Buffer.from(JSON.stringify(object)),
          options
        );
      },
      sendToQueueString(
        queue: string,
        object: string,
        options?: amqplib.Options.Publish | undefined
      ): boolean {
        if (fastify.amqp.queue[queue] === undefined) {
          return false;
        }
        return fastify.amqp.queue[queue].sendToQueue(
          queue,
          Buffer.from(object),
          options
        );
      },
      sendToQueueBuffer(
        queue: string,
        object: Buffer,
        options?: amqplib.Options.Publish | undefined
      ): boolean {
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
  }
);

export default plugin;
