import express from 'express';
import firebaseService from '../services/firebaseService.js';

const router = express.Router();

const clients = new Map(); // steamId -> Set(res)

const requireAuth = (req,res,next)=>{ if(!req.user||!req.user.steamId) return res.status(401).end(); next(); };

router.get('/stream', requireAuth, async (req,res)=>{
  const steamId = req.user.steamId;
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders?.();
  res.write(`event: connected\n`);
  res.write(`data: {"ok":true}\n\n`);
  if(!clients.has(steamId)) clients.set(steamId,new Set());
  clients.get(steamId).add(res);
  req.on('close',()=>{ const set=clients.get(steamId); if(set){ set.delete(res); if(!set.size) clients.delete(steamId);} });
});

// Lightweight notification hook: call after any notification creation (monkey patch createNotification) - optional
const originalCreate = firebaseService.createNotification.bind(firebaseService);
firebaseService.createNotification = async (...args) => {
  const ref = await originalCreate(...args);
  try {
    const steamId = args[0];
    const snap = ref ? await ref.get() : null;
    const data = snap?.exists ? { id: ref.id, ...snap.data() } : null;
    if (data && clients.has(steamId)) {
      for (const res of clients.get(steamId)) {
        res.write(`event: notification\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }
  } catch (_) {}
  return ref;
};

export default router;
