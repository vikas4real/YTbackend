import mongoose, { Schema } from 'mongoose';

const VideoSchema = new Schema(
  {
    videoFile: {
      type: String, //Cloudinary URL
      required: true,
    },
    thumbnailImage: {
      type: String, //Cloudinary URL
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, //will come from Cloudinary
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Number,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },

  {
    timestamps: true,
  }
);

export const Video = mongoose.model('Video', VideoSchema);
