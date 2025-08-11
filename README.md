# MortgageMate

A Tool for helping users make optimal mortgage decisions.

The inspiration for the project was a conversation I had with Claude asking it for mortgage advice. I find Claude useful in this field to myself but it took me knowing how to use Claude well to design the right prompt.

I want to help future me and potentially other people get to a good prompt so they can easily be presented with actionable data and an understanding of their best mortgage options.

## Method

To achieve good mortgage advice outcomes we need to make it as easy as possible for a user to generate a good prompt that describes their entire present mortgage situation.

### Data Gathering (front end)

I've wrapped a LLM chat bot interface to get user data into a TypeScript React full stack web application.

### Data Storage

I've then structured that data into a PostgreSQL database so that key information can be retrieved. We don't store whole prompts because we want to generate fresh prompts each time such that we use the latest prompt templates with the best mortgage advice outcomes.

I have stored data that will apply to most mortgage scenarios in the database though there will be scope for additional data to be stored on each mortgage scenarios for optimal results

### Idea of this project is:

## A) To develop a usable product fast by only vibe-coding (minimal hands-on-code)

This project is not for commercial use so, though my code standards will be kept high, I'm looking to develop an MVP-like product at pace.

## B) To leverage Anthropic API / OpenAI API endpoints

To understand API integrations for Anthropic at a small-scale. both from a cost and performance perspective. I am most used to using LLMs in a desktop/cli capacity so it will be a good learning experience to get hands-on with the APIs.

## C) To showcase prompt-engineering / RAG for ensuring the application is given suitable context in which to reason

I want to use rules-based coding to create good LLM prompts, a principle that applies more broadly to apps that I am interested in building. This lowers token use by optimising the prompts, makes results more consistent and keeps the context window clear for maximal reasoning.
