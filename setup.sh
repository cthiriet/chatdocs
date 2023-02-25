# create a virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# populate .env with the correct values
cd webapp
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8080" > .env.local
npm install
