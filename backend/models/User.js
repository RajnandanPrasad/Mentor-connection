const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["mentor", "mentee"], required: true },
    mentorProfile: {
      title: { type: String, required: function() { return this.role === "mentor"; } },
      bio: { type: String, required: function() { return this.role === "mentor"; } },
      experienceLevel: { type: String, required: function() { return this.role === "mentor"; } },
      location: { type: String },
      availability: { type: Boolean, default: true },
      rating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      hourlyRate: { type: Number },
      isVerified: { type: Boolean, default: false },
      timezone: { type: String },
      languages: [{ type: String }],
      specializations: [{ type: String }]
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
