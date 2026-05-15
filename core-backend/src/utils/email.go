package utils

import (
	"fmt"
	"os"

	"gopkg.in/gomail.v2"
)

func SendEmail(email string, token string) error {
	m := gomail.NewMessage()

	// sender & receiver
	m.SetHeader("From", os.Getenv("SMTP_EMAIL"))
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Reset Password")

	// simple html template
	body := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; padding:20px;">
			<h2 style="color:#333;">Reset Password</h2>

			<p>Gunakan token berikut untuk reset password:</p>

			<div style="
				background:#f4f4f4;
				padding:12px;
				font-size:20px;
				font-weight:bold;
				border-radius:8px;
				width:fit-content;
				letter-spacing:2px;
			">
				%s
			</div>

			<p style="margin-top:20px; color:#777;">
				Token akan expired dalam 10 menit.
			</p>
		</div>
	`, token)

	m.SetBody("text/html", body)

	// smtp config
	d := gomail.NewDialer(
		os.Getenv("SMTP_HOST"),
		587,
		os.Getenv("SMTP_EMAIL"),
		os.Getenv("SMTP_PASSWORD"),
	)

	// send email
	if err := d.DialAndSend(m); err != nil {
		return err
	}

	return nil
}
