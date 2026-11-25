"use client";

import { createAuthClient } from "@neon/auth/next";
import { useState } from "react";
import styles from "./login.module.css";

const client = createAuthClient();
const destination = "/?view=studio";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function run(action) {
    setPending(true);
    setMessage("");
    try {
      await action();
    } catch {
      setMessage("연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setMessage("");
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      if (mode === "verify") {
        const { error } = await client.emailOtp.verifyEmail({ email, otp: String(form.get("otp")).trim() });
        if (error) {
          setMessage("인증 코드를 확인해 주세요. 만료됐다면 다시 받을 수 있어요.");
          return;
        }
        const { data } = await client.getSession();
        if (data?.user) window.location.assign(destination);
        else {
          setMode("login");
          setMessage("이메일 인증이 완료됐어요. 로그인해 주세요.");
        }
        return;
      }
      const password = String(form.get("password"));
      if (mode === "signup") {
        const { error } = await client.signUp.email({ email, password, name: String(form.get("name")).trim() });
        if (error) {
          setMessage("가입하지 못했어요. 주소와 비밀번호를 확인하거나 기존 계정으로 로그인해 주세요.");
          return;
        }
        setMode("verify");
        setMessage("이메일로 받은 6자리 코드를 입력해 주세요.");
        return;
      }
      const { error } = await client.signIn.email({ email, password });
      if (!error) window.location.assign(destination);
      else if (error.code === "EMAIL_NOT_VERIFIED") {
        setMode("verify");
        setMessage("받은 코드를 입력해 주세요. 이메일이 보이지 않으면 코드를 다시 받을 수 있어요.");
      } else setMessage("이메일과 비밀번호를 확인해 주세요.");
    });
  }

  function google() {
    void run(async () => {
      const { error } = await client.signIn.social({ provider: "google", callbackURL: new URL(destination, window.location.origin).href });
      if (error) setMessage("Google 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    });
  }

  function resend() {
    void run(async () => {
      const { error } = await client.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      setMessage(error ? "코드를 다시 보내지 못했어요. 잠시 후 시도해 주세요." : "새 인증 코드를 보냈어요.");
    });
  }

  const title = { login: "로그인", signup: "회원가입", verify: "이메일 인증" }[mode];

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-title">
        <a href="/">← 왕초보 AI 가이드</a>
        <h1 id="auth-title">{title}</h1>
        <p>{mode === "verify" ? email : "저장한 프롬프트와 초안을 내 작업실에서 확인하세요."}</p>
        <form onSubmit={submit} key={mode}>
          <fieldset disabled={pending}>
            {mode === "verify" ? (
              <label>인증 코드<input name="otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required /></label>
            ) : (
              <>
                {mode === "signup" && <label>이름<input name="name" autoComplete="name" maxLength={80} required /></label>}
                <label>이메일<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
                <label>비밀번호<input type="password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></label>
              </>
            )}
            <button type="submit">{pending ? "처리 중…" : title}</button>
          </fieldset>
        </form>
        {mode === "verify" ? (
          <button type="button" disabled={pending} onClick={resend}>인증 코드 다시 받기</button>
        ) : (
          <button type="button" disabled={pending} onClick={google}>Google로 로그인</button>
        )}
        <button type="button" disabled={pending} onClick={() => switchMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "새 계정 만들기" : "로그인으로 돌아가기"}
        </button>
        <p role="status" aria-live="polite">{message}</p>
      </section>
    </main>
  );
}
