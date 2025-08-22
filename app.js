const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const MONGO_URL = "mongodb://localhost:27017/wanderlust";

//mongodb connection
main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.get("/", (req, res) => {
  res.send("hello world");
});

// index route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
});

// new route
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
});

// show route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  console.log("SHOW route hit for listing:", id);
  const listing = await Listing.findById(id);
  res.render("listings/show.ejs", { listing });
});

//create route
app.post("/listings", async (req, res) => {
  // let { title, description, price, location } = req.body;
  const newListing = new Listing(req.body.listings);
  await newListing.save();
  res.redirect("/listings");
});

//edit route
app.get("/listings/:id/edit", async (req, res) => {
  try {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading the edit page.");
  }
});

//update route
app.put("/listings/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let updatedListing = await Listing.findByIdAndUpdate(id, {
      ...req.body.listings,
    });
    console.log("updatedListing:", updatedListing);
    res.redirect("/listings");
  } catch (e) {
    console.log(e);
    res.status(500).send("Error updating the listing.");
  }
});
//delete route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log("deletedListing:", deletedListing);
  res.redirect("/listings");
});

//testing database

// app.get("/testListing", async (req, res) => {
//   let sampleListing = new Listing({
//     title: "traveling ",
//     description: "monument river",
//     price: 100,
//     location: "usa",
//   });

//   await sampleListing.save();
//   console.log("sample listing saved");
//   res.send("sample listing saved");
// });

app.use((req, res, next) => {
  console.log(`No route matched for URL: ${req.originalUrl}`);
  res.status(404).send("Route not found!");
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
