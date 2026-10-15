-- Run ONCE on an EXISTING selectcutz database (MariaDB / XAMPP). New installs do not need this:
-- database/select_cutz_db.sql already contains these changes.
USE selectcutz;

-- 1) A cancelled booking used to keep its slot locked forever. Only ACTIVE bookings are now unique.
ALTER TABLE bookings DROP INDEX unique_booking_slot;
ALTER TABLE bookings ADD COLUMN ActiveSlot TINYINT GENERATED ALWAYS AS (IF(BookingStatus = 'Cancelled', NULL, 1)) STORED;
ALTER TABLE bookings ADD UNIQUE KEY unique_active_booking_slot (ServiceID, BookingDate, BookingTime, ActiveSlot);

-- 2) Gallery table for the admin upload flow.
CREATE TABLE IF NOT EXISTS gallery (
    GalleryID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(100) NOT NULL,
    Caption VARCHAR(255) NULL,
    ImagePath VARCHAR(255) NOT NULL,
    UploadedBy INT NULL,
    UploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UploadedBy) REFERENCES admins(AdminID) ON DELETE SET NULL
);
