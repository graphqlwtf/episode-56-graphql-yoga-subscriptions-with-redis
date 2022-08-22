import { createServer, createPubSub } from "@graphql-yoga/node";
import * as fs from "fs";
import * as path from "path";
import Redis from "ioredis";
import { createRedisEventTarget } from "@graphql-yoga/redis-event-target";

import { Resolvers } from "./types";

const typeDefs = fs.readFileSync(path.join(process.cwd(), "schema.graphql"), {
  encoding: "utf-8",
});

const publishClient = new Redis();
const subscribeClient = new Redis();

const eventTarget = createRedisEventTarget({
  publishClient,
  subscribeClient,
});

const pubSub = createPubSub<{
  newMessage: [payload: { from: string; body: string }];
}>({
  eventTarget,
});

const resolvers: Resolvers = {
  Query: {
    room: () => [],
  },
  Mutation: {
    send: (_, { input }, { pubSub }) => {
      const { roomId, ...newMessage } = input;

      pubSub.publish("newMessage", roomId, newMessage);

      return newMessage;
    },
  },
  Subscription: {
    newMessage: {
      subscribe: (_, { roomId }, { pubSub }) =>
        pubSub.subscribe("newMessage", roomId),
      resolve: (payload) => payload,
    },
  },
};

const server = createServer({
  schema: {
    typeDefs,
    resolvers,
  },
  context: {
    pubSub,
  },
});

server.start();
