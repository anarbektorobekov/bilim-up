import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FaDownload, FaTrash, FaUpload, FaFilePdf, FaImage, FaFileAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import '../../styles/certificates.css';

export default function Certificates() {
  const { currentUser } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newCert, setNewCert] = useState({
    title: '',
    issuer: '',
    date: '',
    file: null,
    fileType: 'pdf'
  });

  useEffect(() => {
    fetchCertificates();
  }, [currentUser]);

  async function fetchCertificates() {
    try {
      const q = query(collection(db, 'certificates'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const certsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCertificates(certsData);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadCertificate() {
    if (!newCert.title.trim()) {
      alert('Введите название сертификата');
      return;
    }
    
    setUploading(true);
    try {
      const certId = `cert_${Date.now()}`;
      
      // Здесь будет логика загрузки файла
      let fileUrl = '';
      if (newCert.file) {
        // Заглушка для загрузки файла
        fileUrl = URL.createObjectURL(newCert.file);
      }
      
      await setDoc(doc(db, 'certificates', certId), {
        id: certId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        title: newCert.title,
        issuer: newCert.issuer || 'Bilim Up',
        date: newCert.date || new Date().toISOString().split('T')[0],
        fileUrl: fileUrl,
        fileType: newCert.fileType,
        createdAt: new Date().toISOString()
      });
      
      await fetchCertificates();
      setShowUploadModal(false);
      setNewCert({ title: '', issuer: '', date: '', file: null, fileType: 'pdf' });
      alert('Сертификат успешно добавлен!');
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при добавлении сертификата');
    } finally {
      setUploading(false);
    }
  }

  async function deleteCertificate(certId) {
    if (window.confirm('Удалить этот сертификат?')) {
      try {
        await deleteDoc(doc(db, 'certificates', certId));
        await fetchCertificates();
        alert('Сертификат удален');
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении');
      }
    }
  }

  function downloadCertificate(cert) {
    if (cert.fileUrl) {
      const link = document.createElement('a');
      link.href = cert.fileUrl;
      link.download = `${cert.title}.pdf`;
      link.click();
    } else {
      // Генерация PDF на клиенте
      generatePDF(cert);
    }
  }

  function generatePDF(cert) {
    // Создаем HTML для печати
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cert.title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f0f0f0;
          }
          .certificate {
            width: 800px;
            background: white;
            border: 20px solid #a78bfa;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .certificate h1 {
            color: #6366f1;
            font-size: 2.5rem;
            margin-bottom: 20px;
          }
          .certificate h2 {
            font-size: 1.8rem;
            margin: 20px 0;
          }
          .certificate p {
            color: #666;
            margin: 10px 0;
          }
          .certificate .date {
            margin-top: 30px;
            color: #999;
          }
          .stamp {
            font-size: 3rem;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <h1>🏆 Сертификат</h1>
          <p>Настоящим подтверждается, что</p>
          <h2>${currentUser.email.split('@')[0]}</h2>
          <p>успешно завершил(а) курс</p>
          <h3>«${cert.title}»</h3>
          <p>Выдан: ${cert.issuer || 'Bilim Up'}</p>
          <div class="date">Дата: ${cert.date || new Date().toLocaleDateString()}</div>
          <div class="stamp">✨</div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  const getFileIcon = (type) => {
    if (type === 'pdf') return <FaFilePdf />;
    if (type === 'image') return <FaImage />;
    return <FaFileAlt />;
  };

  if (loading) {
    return <div className="loading-spinner">Загрузка сертификатов...</div>;
  }

  return (
    <div className="certificates-page">
      <div className="certificates-bg-gradient"></div>
      
      <div className="certificates-container">
        {/* Заголовок */}
        <motion.div 
          className="certificates-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>Мои сертификаты</h1>
          <p>Здесь хранятся все ваши сертификаты и достижения</p>
          <button className="add-certificate-btn" onClick={() => setShowUploadModal(true)}>
            <FaUpload /> Добавить сертификат
          </button>
        </motion.div>

        {/* Список сертификатов */}
        {certificates.length === 0 ? (
          <motion.div 
            className="empty-certificates"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="empty-icon">🎓</div>
            <h3>У вас пока нет сертификатов</h3>
            <p>Завершите курсы или добавьте свои сертификаты</p>
            <button className="btn-primary-glow-small" onClick={() => setShowUploadModal(true)}>
              + Добавить первый сертификат
            </button>
          </motion.div>
        ) : (
          <div className="certificates-grid">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                className="certificate-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="certificate-icon">
                  {getFileIcon(cert.fileType)}
                </div>
                <div className="certificate-info">
                  <h3>{cert.title}</h3>
                  <p className="cert-issuer">{cert.issuer || 'Bilim Up'}</p>
                  <p className="cert-date">📅 {cert.date || new Date(cert.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="certificate-actions">
                  <button className="download-cert-btn" onClick={() => downloadCertificate(cert)}>
                    <FaDownload /> Скачать
                  </button>
                  <button className="delete-cert-btn" onClick={() => deleteCertificate(cert.id)}>
                    <FaTrash />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно добавления сертификата */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <motion.div 
            className="modal-content-cert"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Добавить сертификат</h3>
            
            <div className="upload-form">
              <div className="input-group-cert">
                <label>Название сертификата *</label>
                <input
                  type="text"
                  value={newCert.title}
                  onChange={(e) => setNewCert({...newCert, title: e.target.value})}
                  placeholder="Например: JavaScript Advanced"
                />
              </div>
              
              <div className="input-group-cert">
                <label>Кем выдан</label>
                <input
                  type="text"
                  value={newCert.issuer}
                  onChange={(e) => setNewCert({...newCert, issuer: e.target.value})}
                  placeholder="Например: Bilim Up"
                />
              </div>
              
              <div className="input-group-cert">
                <label>Дата получения</label>
                <input
                  type="date"
                  value={newCert.date}
                  onChange={(e) => setNewCert({...newCert, date: e.target.value})}
                />
              </div>
              
              <div className="input-group-cert">
                <label>Тип файла</label>
                <select
                  value={newCert.fileType}
                  onChange={(e) => setNewCert({...newCert, fileType: e.target.value})}
                >
                  <option value="pdf">PDF</option>
                  <option value="image">Изображение</option>
                </select>
              </div>
              
              <div className="input-group-cert">
                <label>Файл сертификата</label>
                <input
                  type="file"
                  onChange={(e) => setNewCert({...newCert, file: e.target.files[0]})}
                  accept=".pdf,image/*"
                />
                <small>Поддерживаются PDF и изображения</small>
              </div>
            </div>
            
            <div className="modal-buttons">
              <button className="upload-btn" onClick={uploadCertificate} disabled={uploading}>
                {uploading ? 'Загрузка...' : '📤 Загрузить'}
              </button>
              <button className="cancel-btn" onClick={() => setShowUploadModal(false)}>
                Отмена
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}