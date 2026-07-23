package models

import (
	"time"
)

type Family struct {
	ID       uint      `gorm:"primaryKey" json:"id"`
	Code     string    `gorm:"unique;not null" json:"code"`
	Name     string    `gorm:"not null" json:"name"`
	Users    []User    `gorm:"foreignKey:FamilyID" json:"-"`
	Tasks    []Task    `gorm:"foreignKey:FamilyID" json:"-"`
	Messages []Message `gorm:"foreignKey:FamilyID" json:"-"`
	Events   []Event   `gorm:"foreignKey:FamilyID" json:"-"`
}

type User struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Username    string `gorm:"unique;not null" json:"username"`
	DisplayName string `gorm:"not null" json:"displayName"`
	Password    string `gorm:"not null" json:"-"`
	Role        string             `gorm:"default:'MEMBER';not null" json:"role"`
	FamilyID    uint               `gorm:"not null" json:"-"`
	Family      Family             `gorm:"foreignKey:FamilyID" json:"-"`
	PushTokens  []PushSubscription `gorm:"foreignKey:UserID" json:"-"`
}

type Task struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Title            string    `gorm:"not null" json:"title"`
	Description      string    `gorm:"type:text" json:"description"`
	Status           string    `gorm:"default:'TODO';not null" json:"status"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"createdAt"`
	DueDate          *string   `gorm:"type:date" json:"dueDate"`
	CreatedByName    string    `gorm:"not null" json:"createdByName"`
	InProgressByName string    `json:"inProgressByName"`
	CompletedByName  string    `json:"completedByName"`
	FamilyID         uint      `gorm:"not null" json:"-"`
	Family           Family    `gorm:"foreignKey:FamilyID" json:"-"`
}

type Message struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Timestamp time.Time `gorm:"autoCreateTime" json:"timestamp"`
	FamilyID  uint      `gorm:"not null" json:"-"`
	Family    Family    `gorm:"foreignKey:FamilyID" json:"-"`
	SenderID  uint      `gorm:"not null" json:"-"`
	Sender    User      `gorm:"foreignKey:SenderID" json:"sender"`
}

type PushSubscription struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	UserID   uint   `gorm:"not null" json:"userId"`
	Endpoint string `gorm:"unique;not null" json:"endpoint"`
	P256dh   string `gorm:"not null" json:"p256dh"`
	Auth     string `gorm:"not null" json:"auth"`
}

type Event struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	StartTime   time.Time `gorm:"not null" json:"startTime"`
	EndTime     time.Time `gorm:"not null" json:"endTime"`
	FamilyID    uint      `gorm:"not null" json:"-"`
	Family      Family    `gorm:"foreignKey:FamilyID" json:"-"`
}
