import mongoose, { Schema } from 'mongoose';

const SubscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //One who is subscribing
      ref: 'User',
    },
    channel: {
      type: Schema.Types.ObjectId, //One who is subscribed
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
