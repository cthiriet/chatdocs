#!/bin/bash

# create a virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Ask the user for credentials
echo "What is your Pinecone index name?"
read -p "Value: " PINECONE_INDEX_NAME

echo "What is your Pinecone environment?"
read -p "Value: " PINECONE_ENV

echo "What is your Pinecone API key?"
read -p "Value: " PINECONE_API_KEY

echo "What is your OpenAI API key?"
read -p "Value: " OPENAI_API_KEY

# Write the credentials to .env
echo "PINECONE_INDEX_NAME=$PINECONE_INDEX_NAME" >> .env
echo "PINECONE_API_KEY=$PINECONE_API_KEY" >> .env
echo "PINECONE_ENV=$PINECONE_ENV" >> .env
echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env

# populate .env with the correct values
cd webapp

# Write the credentials to .env.local
echo "NEXT_PUBLIC_PINECONE_INDEX_NAME=$PINECONE_INDEX_NAME" >> .env.local
echo "PINECONE_INDEX_NAME=$PINECONE_INDEX_NAME" >> .env.local
echo "PINECONE_API_KEY=$PINECONE_API_KEY" >> .env.local
echo "PINECONE_ENV=$PINECONE_ENV" >> .env.local
echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env.local

npm install
