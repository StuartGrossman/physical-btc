# Bitcoin Seed Generator Server

A Flask server that provides endpoints for generating and validating Bitcoin seeds using BIP39 mnemonics.

## Setup

1. Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will run on `http://localhost:5000`

## API Endpoints

### Generate Seed
- **URL**: `/generate-seed`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "word_count": 12  // or 24
  }
  ```
- **Response**:
  ```json
  {
    "seed": "word1 word2 ...",
    "is_valid": true,
    "word_count": 12,
    "word_list": ["word1", "word2", ...]
  }
  ```

### Validate Seed
- **URL**: `/validate-seed`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "seed": "word1 word2 ..."
  }
  ```
- **Response**:
  ```json
  {
    "is_valid": true,
    "word_list": ["word1", "word2", ...]
  }
  ```

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 400: Bad Request (invalid input)
- 500: Server Error

Error responses include a message:
```json
{
  "error": "Error message"
}
``` 