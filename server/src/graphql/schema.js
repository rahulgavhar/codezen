import { GraphQLError } from "graphql";
import * as usersService from "../services/users.service.js";

export const typeDefs = `#graphql
  type Profile {
    clerk_user_id: String
    app_role: String
    username: String
    display_name: String
    email: String
    avatar_url: String
    bio: String
    rating: Int
    max_rating: Int
    problems_solved: Int
    contests_participated: Int
    skills: [String!]
    is_banned: Boolean
    created_at: String
  }

  type Query {
    meProfile: Profile!
  }
`;

export const resolvers = {
  Query: {
    meProfile: async (_parent, _args, contextValue) => {
      const clerkUserId = contextValue?.clerkUserId;

      if (!clerkUserId) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return usersService.getUserProfile(clerkUserId);
    },
  },
};
