# Instagram Clone

An Instagram-like social media platform built using Node.js, Socket.io, MongoDB, and EJS.

## Features

- User authentication (Sign Up / Login / Logout)
- Real-time chat with Socket.io
- Post creation with image uploads
- Like and comment on posts
- Follow/unfollow users
- Profile pages with user information
- Responsive UI with EJS templates

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS, CSS, JavaScript
- **Database**: MongoDB, Mongoose
- **Real-time Communication**: Socket.io
- **Authentication**: Passport.js, JWT

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/insta-clone.git
   cd insta-clone
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables in a `.env` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=your_port
   ```
4. Start the development server:
   ```sh
   npm start
   ```
5. Open your browser and visit:
   ```
   http://localhost:3000
   ```

## Folder Structure

```
insta-clone/
|───public
|    ├───images
|    │   └───uploads
|    ├───story
|    └───stylesheets
├───routes
└───views
    └───partials
```

## Contributing

Pull requests are welcome. Please open an issue first to discuss any major changes.

## License

This project is licensed under the [MIT License](LICENSE).

