import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'
import { ApiError } from "./ApiError.js";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => {
    try{
        if(!localFilePath)  return null

        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        console.log('file has been uploaded: ', uploadResult)
        return uploadResult
    }
    catch(error){
        return null
    }
    finally{
        if(localFilePath)  fs.unlinkSync(localFilePath)
    }
}

const deleteCloudinaryFile = async(cloudinaryFilePath) => {
    try{
        if(!cloudinaryFilePath) return null
        const getPublicIdFromUrl = (url) => {
            // Regex captures everything after 'upload/' (ignoring 'v12345/') until the file extension
            const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
            const match = url.match(regex);
            return match ? match[1] : null;
        };
        const publicId = getPublicIdFromUrl(cloudinaryFilePath)
        if(!publicId)   throw new ApiError(400, 'error deleting image')

        const deleteResult = await cloudinary.uploader.destroy(publicId, {invalidate: true})

        return deleteResult
    }
    catch(error){
        return null
    }
}

export {uploadOnCloudinary, deleteCloudinaryFile}
//ekj8a9tvrcwlcxfol47l