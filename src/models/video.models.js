import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      type: String,
      required: [true, "Video must be there"],
    },
    thumbnail: {
      type: String,
      required: [true, "Add the thumbnail"],
    },
    title: {
      type: String,
      required: [true, "Please add the title"],
    },
    description: {
      type: String,
      required: [true, "Please add the description"],
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      required: true,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
