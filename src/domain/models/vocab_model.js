import mongoose from "mongoose";
import { TopicEnum } from "../base/topics_enums.js";

const vocabularySchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      enum: Object.values(TopicEnum),
      required: true,
    },
    word: {
      type: String,
      required: true,
    },
    partOfSpeech: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

vocabularySchema.index({ topic: 1, word: 1 }, { unique: true });

export default mongoose.model("Vocabulary", vocabularySchema);