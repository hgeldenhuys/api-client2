import { PostmanCollection } from "~/types/postman";

export const demoCollection: PostmanCollection = {
  info: {
    _postman_id: "demo-collection-001",
    name: "Demo API Collection",
    description: "A demo collection to showcase the API client features",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      id: "get-users",
      name: "Get Users",
      request: {
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/users",
        header: [
          {
            key: "Accept",
            value: "application/json",
          },
        ],
        description: "Get a list of all users",
      },
      event: [
        {
          listen: "test",
          script: {
            exec: [
              "pm.test('Status is 200', () => {",
              "  pm.expect(pm.response).to.have.status(200);",
              "});",
              "",
              "pm.test('Response is an array', () => {",
              "  pm.expect(pm.response.body).to.be.an('array');",
              "});",
              "",
              "pm.test('Response has users', () => {",
              "  pm.expect(pm.response.body.length).to.be.above(0);",
              "});",
            ],
          },
        },
      ],
    },
    {
      id: "get-user",
      name: "Get User by ID",
      request: {
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/users/{{userId}}",
        header: [
          {
            key: "Accept",
            value: "application/json",
          },
        ],
        description: "Get a specific user by ID",
      },
    },
    {
      id: "posts-folder",
      name: "Posts",
      item: [
        {
          id: "get-posts",
          name: "Get All Posts",
          request: {
            method: "GET",
            url: "https://jsonplaceholder.typicode.com/posts",
            header: [
              {
                key: "Accept",
                value: "application/json",
              },
            ],
          },
        },
        {
          id: "create-post",
          name: "Create Post",
          request: {
            method: "POST",
            url: "https://jsonplaceholder.typicode.com/posts",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  title: "New Post Title",
                  body: "This is the body of the new post",
                  userId: 1,
                },
                null,
                2,
              ),
            },
          },
        },
        {
          id: "update-post",
          name: "Update Post",
          request: {
            method: "PUT",
            url: "https://jsonplaceholder.typicode.com/posts/{{postId}}",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  id: 1,
                  title: "Updated Post Title",
                  body: "Updated post body",
                  userId: 1,
                },
                null,
                2,
              ),
            },
          },
        },
        {
          id: "delete-post",
          name: "Delete Post",
          request: {
            method: "DELETE",
            url: "https://jsonplaceholder.typicode.com/posts/{{postId}}",
          },
        },
      ],
    },
  ],
  variable: [
    {
      key: "userId",
      value: "1",
      type: "string",
    },
    {
      key: "postId",
      value: "1",
      type: "string",
    },
  ],
};
