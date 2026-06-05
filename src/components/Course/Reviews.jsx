import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { FaStar, FaTrash } from 'react-icons/fa';

export default function Reviews({ courseId, courseTitle }) {
  const { currentUser, userRole } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [courseId]);

  async function fetchReviews() {
    try {
      const q = query(collection(db, 'reviews'), where('courseId', '==', courseId));
      const querySnapshot = await getDocs(q);
      const reviewsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData);
    } catch (error) {
      console.error('Ошибка загрузки отзывов:', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) {
      alert('Войдите в аккаунт, чтобы оставить отзыв');
      return;
    }
    if (!comment.trim()) {
      alert('Напишите комментарий');
      return;
    }
    try {
      await addDoc(collection(db, 'reviews'), {
        courseId: courseId,
        courseTitle: courseTitle,
        userId: currentUser.uid,
        userName: currentUser.email.split('@')[0],
        rating: rating,
        comment: comment,
        createdAt: new Date().toISOString()
      });
      setComment('');
      setRating(5);
      fetchReviews();
      alert('Спасибо за отзыв!');
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при отправке отзыва');
    }
  }

  async function deleteReview(reviewId) {
    if (window.confirm('Удалить отзыв?')) {
      try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        fetchReviews();
      } catch (error) {
        console.error('Ошибка:', error);
      }
    }
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h3>📝 Отзывы и оценки</h3>
        <div className="average-rating">
          <span className="rating-value">{averageRating}</span>
          <div className="stars">
            {[1,2,3,4,5].map(star => (
              <FaStar key={star} className={star <= averageRating ? 'filled' : 'empty'} />
            ))}
          </div>
          <span className="reviews-count">({reviews.length} отзывов)</span>
        </div>
      </div>

      {currentUser && (
        <form onSubmit={submitReview} className="review-form">
          <div className="rating-select">
            <span>Ваша оценка:</span>
            <div className="star-rating">
              {[1,2,3,4,5].map(star => (
                <FaStar
                  key={star}
                  className={star <= (hoverRating || rating) ? 'selected' : ''}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Поделитесь своим мнением о курсе..."
            rows="3"
          />
          <button type="submit" className="submit-review-btn">📝 Оставить отзыв</button>
        </form>
      )}

      <div className="reviews-list">
        {loading ? (
          <div className="loading">Загрузка отзывов...</div>
        ) : reviews.length === 0 ? (
          <div className="no-reviews">Пока нет отзывов. Будьте первым!</div>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">👤 {review.userName}</span>
                  <div className="review-stars">
                    {[1,2,3,4,5].map(star => (
                      <FaStar key={star} className={star <= review.rating ? 'filled' : 'empty'} />
                    ))}
                  </div>
                </div>
                {(userRole === 'admin' || review.userId === currentUser?.uid) && (
                  <button className="delete-review" onClick={() => deleteReview(review.id)}>
                    <FaTrash />
                  </button>
                )}
              </div>
              <div className="review-comment">{review.comment}</div>
              <div className="review-date">{new Date(review.createdAt).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}