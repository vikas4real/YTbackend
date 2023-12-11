import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
   {
      phone: {
         type: String,
         required: true,
      },
   },
   { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
