import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

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
        const publicId = cloudinaryFilePath.split('/').pop().split('.')[0]

        const deleteResult = await cloudinary.uploader.destroy(cloudinaryFilePath, {invalidate: true})

        console.log('file has been deleted: ', deleteResult)
        return deleteResult
    }
    catch(error){
        return null
    }
}

export {uploadOnCloudinary, deleteCloudinaryFile}