import express from "express";
const app = express();

const port = process.env.PORT || 8080;

const jokes = [
    {
        id: 1,
        title: "Dad Jokes",
        content: "What did one tomato say to the other tomato? You're the tomato on the tomato stand."
    },
    {
        id: 2,
        title: "Dad Jokes",
        content: "What did one tomato say to the other tomato? You're the tomato on the tomato stand."
    },
    {
        id: 3,
        title: "Dad Jokes",
        content: "What did one tomato say to the other tomato? You're the tomato on the tomato stand."
    }
]

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get('/api/jokes', (req, res) => {
    res.send(jokes);
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});