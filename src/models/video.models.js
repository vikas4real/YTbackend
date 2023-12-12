import mongoose, { Schema } from 'mongoose';

const VideoSchema = new Schema(
  {
    videoFile: {
      type: String, //Cloudniry URL
      required: true,
    },
    thumbnailImage: {
      type: String, //Cloudniry URL
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
      type: Number, //will come from cloudniry
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
