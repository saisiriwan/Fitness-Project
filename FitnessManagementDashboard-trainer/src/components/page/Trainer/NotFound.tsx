import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/* Component: NotFound
   ใช้สำหรับ: Route ที่ไม่ตรงกับหน้าไหนเลย
   หน้าที่: แสดงหน้า 404 + link กลับหน้าแรก */
const NotFound = () => {
  const location = useLocation();

  // log error เพื่อดีบัก (เมื่อ path เปลี่ยน = ใหม่)
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="not-found-container">
      <div className="not-found-content-wrapper">
        <h1 className="not-found-error-code">404</h1>
        <p className="not-found-error-message">Oops! Page not found</p>
        <a href="/" className="not-found-home-link">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
