import { v2 } from "cloudinary";   
import {getAuth} from '@clerk/nextjs/server';
import { connect } from "mongoose";
import connectDB from "@/config/db";

//configure cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const {userId} = getAuth();
    const isSeller = await authSeller(userId);
    if (!isSeller) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const price = formData.get("price");
    const category = formData.get("category");
    const offerPrice = formData.get("offerPrice");
    const files = formData.getAll("images");

    const productData = {
      name,
      description,
      price,
      category,
      offerPrice
    };

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: "No images provided" });
    }
    const result = await Promise.all(files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {resource_type: 'auto'},
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(buffer);
        });
    }));
    const images = result.map(result => result.secure_url);

    await connectDB();
    const newProduct = await Product.create({
      userId,
      name,
      description,
      price: Number(price),
      offerPrice: Number(offerPrice),
      images,
      date: Date.now()
    });

    return NextResponse.json({ success: true, message: 'Upload Successful', newProduct })
  } catch (error) {
    return NextResponse.json({ success: false, message: "No images provided" })
  }
}