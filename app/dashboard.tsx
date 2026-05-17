import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { saveGalleryImage, getGalleryImages, GalleryImage } from '@/utils/storage';
import { Link } from 'expo-router';

export default function DashboardPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [category, setCategory] = useState('#חתונה');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    const data = await getGalleryImages();
    setImages(data);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      setImageWidth(result.assets[0].width);
      setImageHeight(result.assets[0].height);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
    setIsUploading(true);
    
    // Calculate display dimensions maintaining aspect ratio (max 600px)
    const MAX_DIM = 600;
    let w = imageWidth || 400;
    let h = imageHeight || 400;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = (h / w) * MAX_DIM;
        w = MAX_DIM;
      } else {
        w = (w / h) * MAX_DIM;
        h = MAX_DIM;
      }
    }

    await saveGalleryImage({
      uri: selectedImage,
      category: category,
      width: w,
      height: h,
    });
    
    setSelectedImage(null);
    setCategory('#חתונה');
    setIsUploading(false);
    loadImages();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Link href="/gallery" style={styles.backLink}>חזרה לגלריה</Link>
        <Text style={styles.title}>לוח בקרה - ניהול תמונות</Text>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>העלאת תמונה חדשה</Text>
        
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <Text style={styles.pickerText}>לחץ לבחירת תמונה</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="קטגוריה (לדוגמה: #חתונה)"
          placeholderTextColor="#888"
        />

        <TouchableOpacity 
          style={[styles.uploadBtn, (!selectedImage || isUploading) && styles.uploadBtnDisabled]} 
          onPress={handleUpload}
          disabled={!selectedImage || isUploading}
        >
          <Text style={styles.uploadBtnText}>{isUploading ? 'מעלה...' : 'העלה לגלריה'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>תמונות בגלריה ({images.length})</Text>
        <View style={styles.grid}>
          {images.map(img => (
            <View key={img.id} style={styles.gridItem}>
              <Image source={{ uri: img.uri }} style={styles.gridImage} />
              <Text style={styles.gridCat}>{img.category}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  backLink: {
    color: '#aaa',
    fontSize: 16,
  },
  uploadSection: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'right',
  },
  imagePicker: {
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  pickerText: {
    color: '#888',
    fontSize: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'right',
  },
  uploadBtn: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listSection: {
    padding: 20,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '30%',
    minWidth: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 150,
  },
  gridCat: {
    color: '#fff',
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
  }
});
