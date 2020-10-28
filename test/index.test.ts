import fastify, {FastifyInstance} from 'fastify';

import {describe, it} from 'mocha';
import {expect} from 'chai';

import Plugin from '../src';
import {Message} from 'amqplib';

const NO_ACK = {
  noAck: false,
};

async function getQueue(queue: string) {
  const app = fastify();
  app.register(Plugin, {
    amqp: 'amqp://localhost:5672',
    queue: {
      [queue]: {durable: false},
    },
  });
  await app.listen(0);
  return app;
}

function endQueue(app: FastifyInstance) {
  after(async () => {
    setTimeout(async () => {
      await app.close();
    }, 500);
  });
}

describe('test plugin', () => {
  it('expect error options', async () => {
    const app = fastify();
    app.register(Plugin, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      amqp: undefined as any,
    });
    try {
      await app.listen(0);
    } catch (err) {
      expect(err).to.be.an('Error');
    }
    await app.close();
  });

  it('expect error connection', async () => {
    const app = fastify();
    app.register(Plugin, {
      amqp: 'null',
    });
    try {
      await app.listen(0);
    } catch (err) {
      expect(err).to.be.an('Error');
    }
    await app.close();
  });

  it('expect amqp exist', async () => {
    const app = fastify();
    app.register(Plugin, {
      amqp: 'amqp://localhost:5672',
    });
    app.register(Plugin, {
      amqp: 'amqp://localhost:5672',
    });
    try {
      await app.listen(0);
    } catch (err) {
      expect(err).to.be.an('Error');
    }
    await app.close();
  });

  it('expect queue', async () => {
    const app = fastify();
    app.register(Plugin, {
      amqp: 'amqp://localhost:5672',
      queue: {
        message: {
          durable: false,
        },
        email: {},
      },
    });
    await app.listen(0);
    expect(app.amqp.queue['message']).not.to.be.null;
    expect(app.amqp.queue['message']).not.to.be.undefined;
    expect(app.amqp.queue['email']).not.to.be.null;
    expect(app.amqp.queue['email']).not.to.be.undefined;
    await app.close();
  });

  it('expect consume error', async () => {
    const app = fastify();
    app.register(Plugin, {
      amqp: 'amqp://localhost:5672',
    });
    try {
      await app.listen(0);
      await app.amqp.consume('null', () => {});
    } catch (err) {
      expect(err).to.be.an('Error');
    }
    await app.close();
  });

  it('expect string message in consume, use sendToQueueString to send', async () => {
    const queue = 'string';
    const app = await getQueue(queue);
    const rawMessage = 'test';

    app.amqp.consume(
      queue,
      message => {
        expect(message!.content!.toString()).to.be.equal(rawMessage);
        app.amqp.queue[queue].ack(message as Message);
      },
      NO_ACK
    );

    expect(app.amqp.sendToQueueString(queue, rawMessage)).to.be.true;
    expect(app.amqp.sendToQueueString('error', rawMessage)).to.be.false;

    expect(app.amqp.queue[queue]).not.to.be.null;
    expect(app.amqp.queue[queue]).not.to.be.undefined;

    endQueue(app);
  });

  it('expect json message in consume, use sendToQueueJson to send', async () => {
    const queue = 'json';
    const app = await getQueue(queue);
    const rawMessage = {
      response: true,
    };

    app.amqp.consume(
      queue,
      message => {
        expect(JSON.parse(message!.content!.toString())).to.be.deep.equal(
          rawMessage
        );
        app.amqp.queue[queue].ack(message as Message);
      },
      NO_ACK
    );

    expect(app.amqp.sendToQueueJson(queue, rawMessage)).to.be.true;
    expect(app.amqp.sendToQueueJson('error', rawMessage)).to.be.false;

    expect(app.amqp.queue[queue]).not.to.be.null;
    expect(app.amqp.queue[queue]).not.to.be.undefined;

    endQueue(app);
  });

  it('expect buffer message in consume, use sendToQueueBuffer to send', async () => {
    const queue = 'buffer';
    const app = await getQueue(queue);
    const rawMessage = Buffer.from(queue);

    app.amqp.consume(
      queue,
      message => {
        expect(message?.content.toString()).to.be.equal(rawMessage.toString());
        app.amqp.queue[queue].ack(message as Message);
      },
      NO_ACK
    );

    expect(app.amqp.sendToQueueBuffer(queue, rawMessage)).to.be.true;
    expect(app.amqp.sendToQueueBuffer('error', rawMessage)).to.be.false;

    expect(app.amqp.queue[queue]).not.to.be.null;
    expect(app.amqp.queue[queue]).not.to.be.undefined;

    endQueue(app);
  });
});
