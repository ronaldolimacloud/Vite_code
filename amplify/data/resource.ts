import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The schema below defines the data models for your application.
The authorization rules determine who can access what data.
=========================================================================*/
const schema = a.schema({
  // Todo model removed
    
  Author: a
    .model({
      name: a.string().required(),
      articles: a.hasMany('News', 'authorId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),
    
  Publisher: a
    .model({
      name: a.string().required(),
      news: a.hasMany('News', 'publisherId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),
    
  News: a
    .model({
      title: a.string().required(),
      body: a.string().required(),
      image: a.string(),
      created_at: a.string(),
      authorId: a.id(),
      publisherId: a.id(),
      author: a.belongsTo('Author', 'authorId'),
      publisher: a.belongsTo('Publisher', 'publisherId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: news } = await client.models.News.list()

// return <ul>{news.map(article => <li key={article.id}>{article.title}</li>)}</ul>
